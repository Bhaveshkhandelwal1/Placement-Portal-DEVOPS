import xml.etree.ElementTree as ET

with open("Jenkinsfile", "r") as f:
    script_content = f.read()

tree = ET.parse("jenkins_config.xml")
root = tree.getroot()

# Remove the old SCM definition
for elem in root.findall("definition"):
    root.remove(elem)

# Add new inline script definition
new_def = ET.SubElement(root, "definition", {"class": "org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition", "plugin": "workflow-cps@4275.vb_0565eb_a_3d36"})
script_elem = ET.SubElement(new_def, "script")
script_elem.text = script_content
sandbox = ET.SubElement(new_def, "sandbox")
sandbox.text = "true"

tree.write("jenkins_config_inlined.xml", xml_declaration=True, encoding="utf-8")
